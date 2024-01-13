import { TransactionType } from 'typedb-driver';

import type { PipelineOperation } from '../pipeline';
import { getSessionOrOpenNewOne } from './helpers';

export const runTQLFetch: PipelineOperation = async (req, res) => {
	const { dbHandles, bqlRequest, tqlRequest, config } = req;
	if (!bqlRequest) {
		throw new Error('BQL request not parsed');
	}
	if (!tqlRequest) {
		throw new Error('TQL request not built');
	}
	if (!tqlRequest.entity) {
		throw new Error('BQL request error, no entities');
	}
	const { query } = bqlRequest;
	if (!query) {
		throw new Error('BQL request is not a query');
	}

	const { session } = await getSessionOrOpenNewOne(dbHandles, config);

	const transaction = await session.transaction(TransactionType.READ);
	if (!transaction) {
		throw new Error("Can't create transaction");
	}
	const entityStream = transaction.query.fetch(tqlRequest.entity);

	const entityJsonObjs = await entityStream.collect();

	await transaction.close();

	res.rawTqlRes = {
		entityJsonObjs,
	};
	// console.log('rawTqlRes', JSON.stringify(res.rawTqlRes, null, 2));
};
