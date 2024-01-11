import { listify } from 'radash';

import { getLocalFilters } from '../../helpers';
import type { PipelineOperation } from '../pipeline';
import { EOL } from 'os';

export const buildTQLFetch: PipelineOperation = async (req) => {
	const { schema, bqlRequest } = req;
	if (!bqlRequest?.query) {
		throw new Error('BQL query not parsed');
	}
	const { query } = bqlRequest;
	const currentThingSchema = '$entity' in query ? query.$entity : query.$relation;

	const thingPath = currentThingSchema.defaultDBConnector.path || currentThingSchema.name;
	if (!thingPath) {
		throw new Error(`No thing path in ${JSON.stringify(currentThingSchema)}`);
	}

	// todo: composite Ids
	if (!currentThingSchema.idFields) {
		throw new Error('No id fields');
	}
	const [idField] = currentThingSchema.idFields;
	const idParam = `$${thingPath}_id`;
	let idFilter = `, has ${idField} ${idParam};`;
	if (query.$id) {
		if (Array.isArray(query.$id)) {
			idFilter += ` ${idParam} like "${query.$id.join('|')}";`;
		} else {
			idFilter += ` ${idParam} "${query.$id}";`;
		}
	}

	const localFiltersTql = getLocalFilters(currentThingSchema, query);

	const allRoles =
		'roles' in currentThingSchema
			? listify(currentThingSchema.roles, (k: string, v) => ({
					path: k,
					var: `$${k}`,
					schema: v,
				}))
			: [];

	const queryStr = `match $${thingPath}  isa! ${thingPath}, has attribute $attribute ${localFiltersTql} ${idFilter} fetch $${thingPath}: attribute;`;

	const relations = currentThingSchema.linkFields?.flatMap((linkField) => {
		// if the target is the relation
		const dirRel = linkField.target === 'relation'; // direct relation

		// FIXME handle later
		if (dirRel) {
			return '';
		}

		const tarRel = linkField.relation;
		const relVar = `$${tarRel}`;

		const relationMatchStart = `${dirRel ? relVar : ''} (${linkField.plays}: $${thingPath}`;

		const relationMatchOpposite = linkField.oppositeLinkFieldsPlayedBy.map((link) =>
			!dirRel ? `${link.plays}: $${link.plays}` : null,
		);

		const roles = [relationMatchStart, ...relationMatchOpposite].filter((x) => x).join(',');

		if (schema.relations[linkField.relation] === undefined) {
			throw new Error(`Relation ${linkField.relation} not found in schema`);
		}

		const relationPath = schema.relations[linkField.relation].defaultDBConnector.path || linkField.relation;

		const relationMatchEnd = `) isa ${relationPath};`;

		const relationIdFilters = linkField.oppositeLinkFieldsPlayedBy
			.map((link) => {
				const target = link.plays;

				return `$${target} isa ${link.thing}, has id $${target}_id;`;
			})
			.join(' ');

		[linkField.plays, ...linkField.oppositeLinkFieldsPlayedBy.map((link) => link.plays)];

		const fetchTarget = `
			${linkField.oppositeLinkFieldsPlayedBy
				.map((link) => {
					return `$${link.plays}: attribute;`;
				})
				.join(' ')}`;

		const request = `${linkField.path}: { match ${roles} ${relationMatchEnd} ${relationIdFilters} fetch ${fetchTarget} };`;

		return request;
	});

	req.tqlRequest = {
		entity: queryStr + relations?.join(EOL),
	};
	// console.log('req.tqlRequest', req.tqlRequest);
};
