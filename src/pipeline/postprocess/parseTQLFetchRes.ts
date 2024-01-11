import type { PipelineOperation } from '../pipeline';
import type { JSON } from 'typedb-driver';
import type { FromSchema } from 'json-schema-to-ts';
import Ajv from 'ajv';
import { getPath } from '../../helpers';

const schema = {
	type: 'object',
	required: ['attribute', 'type'],
	properties: {
		type: {
			type: 'object',
			properties: {
				label: { type: 'string' },
				root: { type: 'string' },
			},
			required: ['label', 'root'],
		},
		attribute: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					value: { type: 'string' },
					value_type: { type: 'string' },
					type: {
						type: 'object',
						properties: {
							label: { type: 'string' },
							root: { type: 'string' },
						},
						required: ['label', 'root'],
					},
				},
				required: ['type', 'value', 'value_type'],
			},
		},
	},
} as const;

const parseAttributes = (req: Parameters<PipelineOperation>[0], payload: JSON, result: Record<string, unknown>) => {
	const { bqlRequest } = req;
	if (!bqlRequest) {
		throw new Error('BQL request not parsed');
	}

	const { query } = bqlRequest;

	if (!query) {
		throw new Error('unimplemented');
	}

	if (!('$entity' in query)) {
		throw new Error('unimplmented');
	}

	// @ts-expect-error fix later
	if ('attribute' in payload) {
		const ajv = new Ajv();
		const validate = ajv.compile(schema);
		const valid = validate(payload);

		if (!valid) {
			console.log('unimplemented payload', payload);
			throw new Error('unimplmented');
		}

		const { attribute, type } = payload as FromSchema<typeof schema>;

		if (type.label === query.$entity.name) {
			// dealing with the main entity
			for (const attr of attribute) {
				const key = getPath(attr.type.label);
				result[key] = attr.value;

				if (key === 'id') {
					// NOTE Does not handle composite id, just like the exisitng query function
					result['$id'] = attr.value;
				}
			}

			result[`$${query['$entity'].thingType}`] = query.$entity.name;
		} else {
			// dealing with relations and roles, only return id at the moment
			for (const attr of attribute.filter((attr) => attr.type.label === 'id')) {
				const currOppositeLinkfield = req.schema.entities[type.label].linkFields?.find(
					({ oppositeLinkFieldsPlayedBy }) => oppositeLinkFieldsPlayedBy[0].thing === query.$entity.name,
				);

				if (!currOppositeLinkfield) {
					throw new Error('missing oppositeLinkfield');
				}

				if (Array.isArray(result[currOppositeLinkfield.plays])) {
					(result[getPath(currOppositeLinkfield.plays)] as Array<string>).push(attr.value);
				} else {
					result[getPath(currOppositeLinkfield.plays)] = [attr.value];
				}
			}
		}
	} else {
		for (const p of Object.values(payload)) {
			parseAttributes(req, p, result);
		}
	}
};

export const parseTQLFetchRes: PipelineOperation = async (req, res) => {
	const { bqlRequest } = req;
	const { rawTqlRes } = res;
	if (!bqlRequest) {
		throw new Error('BQL request not parsed');
	} else if (!rawTqlRes) {
		throw new Error('TQL query not executed');
	}

	// console.log('check schema', JSON.stringify(req.schema, null, 2));
	// console.log('what is entities', schema);

	if (!rawTqlRes.entityJsonObjs) {
		throw new Error('entityJsonObjs is undefined');
	}

	res.bqlRes = rawTqlRes.entityJsonObjs.map((jsonObj) => {
		const result = {};

		parseAttributes(req, jsonObj, result);

		return result;
	});
};
