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
					// add preserved field
					result['$id'] = attr.value;
				}
			}
			// add preserved field
			result['$entity'] = query.$entity.name;
		} else {
			// dealing with relations and roles, only return id at the moment
			for (const attr of attribute.filter((attr) => attr.type.label === 'id')) {
				if (Array.isArray(result[type.label.toLowerCase()])) {
					(result[type.label.toLowerCase()] as Array<string>).push(attr.value);
				} else {
					result[type.label.toLowerCase()] = [attr.value];
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
	const { rawTqlRes } = res;

	if (!rawTqlRes) {
		throw new Error('rawTqlRes is undefined');
	}

	if (!rawTqlRes.entityJsonObjs) {
		throw new Error('entityJsonObjs is undefined');
	}

	res.bqlRes = rawTqlRes.entityJsonObjs.map((jsonObj) => {
		const result = {};

		parseAttributes(req, jsonObj, result);

		return result;
	});
};
