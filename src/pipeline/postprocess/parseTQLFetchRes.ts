import type { PipelineOperation } from '../pipeline';
import type { FromSchema } from 'json-schema-to-ts';
import Ajv from 'ajv';
// import { set } from 'lodash-es'

export const parseTQLFetchRes: PipelineOperation = async (req, res) => {
	const ajv = new Ajv();

	const schema = {
		type: 'object',
		required: ['attribute'],
		properties: {
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

	const { bqlRequest } = req;
	const { rawTqlRes } = res;
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

	const result = rawTqlRes?.entityJsonObj?.map((jsonObj) => {
		const entityName = query.$entity.name;
		const item = jsonObj[entityName];

		const validate = ajv.compile(schema);
		const valid = validate(item);

		if (!valid) {
			console.log('unimplemented payload', item);
			throw new Error('unimplmented');
		}

		const { attribute } = item as FromSchema<typeof schema>;

		console.log('hi attribute', attribute);

		const obj = Object.fromEntries([
			['$entity', entityName],
			...attribute.map((a) => {
				// console.log('test', a.type.label);

				return [a.type.label, a.value];
			}),
		]);

		console.log('test', obj);
	});
};
