import 'jest';

import type BormClient from '../../../src/index';
import { init } from '../../helpers/lifecycle';
import { deepSort } from '../../helpers/matchers';

describe('Fetch', () => {
	let dbName: string | undefined;
	let client: BormClient;

	beforeAll(async () => {
		const { dbName: configDbName, bormClient: configClient } = await init();
		if (!configClient) {
			throw new Error('Failed to initialize BormClient');
		}
		dbName = configDbName;
		client = configClient;
	}, 15000);

	// it('v1[validation] - $entity missing', async () => {
	// 	expect(client).toBeDefined();
	// 	// @ts-expect-error - $entity is missing
	// 	await expect(client.fetch({})).rejects.toThrow();
	// });

	// it('v2[validation] - $entity not in schema', async () => {
	// 	expect(client).toBeDefined();
	// 	await expect(client.fetch({ $entity: 'fakeEntity' })).rejects.toThrow();
	// });

	// it('v3[validation] - $id not existing', async () => {
	// 	expect(client).toBeDefined();
	// 	const res = await client.fetch({ $entity: 'User', $id: 'nonExisting' });
	// 	await expect(res).toBeNull();
	// });

	it('e1[entity] - basic and direct link to relation', async () => {
		expect(client).toBeDefined();
		const query = { $entity: 'User' };
		const expectedRes = [
			{
				'$entity': 'User',
				'$id': 'user1',
				'name': 'Antoine',
				'email': 'antoine@test.com',
				'id': 'user1',
				'accounts': ['account1-1', 'account1-2', 'account1-3'],
				'spaces': ['space-1', 'space-2'],
				'user-tags': ['tag-1', 'tag-2'],
			},
			{
				'$entity': 'User',
				'$id': 'user2',
				'name': 'Loic',
				'email': 'loic@test.com',
				'id': 'user2',
				'accounts': ['account2-1'],
				'spaces': ['space-2'],
				'user-tags': ['tag-3', 'tag-4'],
			},
			{
				'$entity': 'User',
				'$id': 'user3',
				'name': 'Ann',
				'email': 'ann@test.com',
				'id': 'user3',
				'accounts': ['account3-1'],
				'spaces': ['space-2'],
				'user-tags': ['tag-2'],
			},
			{
				$entity: 'User',
				$id: 'user4',
				id: 'user4',
				name: 'Ben',
			},
			{
				$entity: 'User',
				$id: 'user5',
				email: 'charlize@test.com',
				id: 'user5',
				name: 'Charlize',
				spaces: ['space-1'],
			},
		];
		const res = await client.fetch(query);
		expect(res).toBeDefined();
		expect(res).not.toBeInstanceOf(String);
		expect(deepSort(res, 'id')).toEqual(expectedRes);
	});
});
