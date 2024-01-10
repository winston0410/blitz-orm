import type { PipelineOperation } from '../pipeline';
// import { set } from 'lodash-es'
// import {

// } from "typedb-protocol/proto/answer";

export const parseTQLFetchRes: PipelineOperation = async (req, res) => {
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

	console.log('hi req');
	console.log('hi res', res);
	const result = rawTqlRes?.entityJsonObj?.map((jsonObj) => {
		const entityName = query.$entity.name;
		const { attribute } = jsonObj[entityName] as {
			attribute: Array<any>;
		};

		console.log('test', entityName);
	});
};
