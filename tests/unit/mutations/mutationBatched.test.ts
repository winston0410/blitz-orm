import 'jest';

import type BormClient from '../../../src/index';
import { cleanup, init } from '../../helpers/lifecycle';
import { expectArraysInObjectToContainSameElements } from '../../helpers/matchers';

describe('Mutations: batched and tempId', () => {
	let dbName: string;
	let bormClient: BormClient;

	beforeAll(async () => {
		const { dbName: configDbName, bormClient: configBormClient } = await init();
		if (!configBormClient) {
			throw new Error('Failed to initialize BormClient');
		}
		dbName = configDbName;
		bormClient = configBormClient;
	}, 15000);

	it('c1[multi, create, link] Simple tempIds', async () => {
		expect(bormClient).toBeDefined();
		const res = await bormClient.mutate([
			{
				$entity: 'User',
				name: 'Peter',
				email: 'Peter@test.ru',
				accounts: [{ provider: 'google' }, { $op: 'link', $tempId: '_:acc1' }],
			},
			{
				$tempId: '_:acc1',
				$op: 'create',
				$entity: 'Account',
				provider: 'MetaMask',
			},
		]);

		expect(res?.length).toBe(5);
		const acc1Id = (res as any[])?.find((r) => r.$tempId === '_:acc1')?.id;

		const account = await bormClient.query({ $entity: 'Account', $id: acc1Id });
		expect(account).toBeDefined();
		expect(account).toEqual({
			$entity: 'Account',
			$id: acc1Id,
			id: acc1Id,
			provider: 'MetaMask',
			// expect any string as the user id is generated by the server
			user: expect.any(String),
		});
	});

	it('c1r[multi, create, link] nested tempIds in relation', async () => {
		expect(bormClient).toBeDefined();
		const res = await bormClient.mutate([
			{
				$relation: 'UserTagGroup',
				$tempId: '_:utg1',
			},
			{
				$relation: 'UserTag',
				name: 'hey',
				users: [{ name: 'toDelete' }],
				group: { $tempId: '_:utg1', $op: 'link' },
			},
		]);

		expect(res?.length).toBe(5);
		const utg1Id = (res as any[])?.find((r) => r.$tempId === '_:utg1')?.id;

		const utg = await bormClient.query({
			$relation: 'UserTagGroup',
			$id: utg1Id,
		});
		expect(utg).toBeDefined();
		expect(utg).toEqual({
			$relation: 'UserTagGroup',
			$id: utg1Id,
			id: utg1Id,
			tags: [expect.any(String)],
		});
	});

	it('c2[multi, create, link] Nested tempIds simple', async () => {
		expect(bormClient).toBeDefined();
		const res = await bormClient.mutate([
			{
				$entity: 'Account',
				provider: 'Facebook',
				user: {
					$tempId: '_:bea',
					$op: 'link',
				},
			},
			{
				$entity: 'Account',
				provider: 'Google',
				user: {
					$op: 'create', // atm we need to indicate 'create' whrn using $tempId
					$tempId: '_:bea',
					name: 'Bea',
					email: 'bea@gmail.com',
				},
			},
		]);
		expect(res?.length).toBe(5);

		const beaId = (res as any[])?.find((r) => r.$tempId === '_:bea')?.id;

		const res2 = await bormClient.query({ $entity: 'User', $id: beaId });
		expect(res2).toBeDefined();
		expect(res2).toEqual({
			$entity: 'User',
			$id: beaId,
			id: beaId,
			name: 'Bea',
			email: 'bea@gmail.com',
			accounts: [expect.any(String), expect.any(String)],
		});
		// delete all
		await bormClient.mutate([
			{
				$entity: 'User',
				$id: 'bea',
				$op: 'delete',
				accounts: [{ $op: 'delete' }],
			},
		]);
	});

	it('c2r[multi, create, link] nested tempIds in relation', async () => {
		expect(bormClient).toBeDefined();
		const res = await bormClient.mutate([
			{
				$relation: 'UserTagGroup',
				$tempId: '_:utg1',
				$op: 'create',
				color: { id: 'darkGreen' },
				tags: [{ id: 'tggege', users: [{ $op: 'create', $tempId: '_:us' }] }],
			},
			{
				$relation: 'UserTag',
				id: 'deletableTag',
				name: 'hey',
				users: [{ $tempId: '_:us', $op: 'link' }],
				group: { $tempId: '_:utg1', $op: 'link' }, // todo => group: '_:utg1'
			},
		]);

		expect(res?.length).toBe(8);
		const usId = (res as any[])?.find((r) => r.$tempId === '_:us')?.id;
		const utg1Id = (res as any[])?.find((r) => r.$tempId === '_:utg1')?.id;
		// console.log('res', res);

		const user = await bormClient.query(
			{
				$entity: 'User',
				$id: usId,
				$fields: ['id', 'name', { $path: 'user-tags', $fields: ['color', 'group', 'users', 'name'] }],
			},
			{ noMetadata: true },
		);
		expect(user).toBeDefined();

		const expectedUser = {
			'id': usId,
			'name': 'toDelete',
			'user-tags': [
				{
					color: 'darkGreen',
					group: utg1Id,
					users: [usId],
				},
				{
					color: 'darkGreen',
					name: 'hey',
					group: utg1Id,
					users: [usId],
				},
			],
		};
		// console.log('user');
		// @ts-expect-error - TODO description
		expectArraysInObjectToContainSameElements(user, expectedUser);

		// clean

		await bormClient.mutate([
			{
				$entity: 'User',
				$id: usId,
				$op: 'delete',
			},
			{
				$relation: 'UserTagGroup',
				$id: utg1Id,
				$op: 'delete',
			},
			{
				$relation: 'UserTag',
				$id: 'tggege',
				$op: 'delete',
			},
			{
				$relation: 'UserTag',
				$id: 'deletableTag',
				$op: 'delete',
			},
		]);
	});

	it('c3[multi, create, link] Nested tempIds triple', async () => {
		expect(bormClient).toBeDefined();
		const res = await bormClient.mutate([
			{
				$entity: 'Account',
				provider: 'Facebook',
				user: {
					$tempId: '_:bea',
					$op: 'link',
				},
			},
			{
				$entity: 'Account',
				provider: 'Metamask',
				user: {
					$tempId: '_:bea',
					$op: 'link',
				},
			},
			{
				$entity: 'Account',
				provider: 'Google',
				user: {
					$op: 'create', // atm we need to indicate 'create' whrn using $tempId
					$tempId: '_:bea',
					name: 'Bea',
					email: 'bea@gmail.com',
				},
			},
		]);
		expect(res?.length).toBe(7);

		const beaId = (res as any[])?.find((r) => r.$tempId === '_:bea')?.id;

		const res2 = await bormClient.query({ $entity: 'User', $id: beaId });
		expect(res2).toBeDefined();
		expect(res2).toEqual({
			$entity: 'User',
			$id: beaId,
			id: beaId,
			name: 'Bea',
			email: 'bea@gmail.com',
			accounts: [expect.any(String), expect.any(String), expect.any(String)],
		});
		// delete all
		await bormClient.mutate([
			{
				$entity: 'User',
				$id: 'bea',
				$op: 'delete',
				accounts: [{ $op: 'delete' }],
			},
		]);
	});

	it('c4[multi, create, link] Complex tempIds', async () => {
		expect(bormClient).toBeDefined();
		const res = await bormClient.mutate([
			{
				$entity: 'User',
				name: 'Peter',
				email: 'Peter@test.ru',
				accounts: [
					{ provider: 'google', $op: 'create' },
					{ $op: 'create', $tempId: '_:acc1', provider: 'facebook' },
				],
			},
			{
				$tempId: '_:us1',
				$op: 'create',
				$entity: 'User',
				name: 'Bob',
			},
			{
				$entity: 'User',
				name: 'Bea',
				accounts: [
					{ provider: 'facebook' },
					{ $tempId: '_:gh1', $op: 'link' },
					// { $op: 'link', $filter: { provider: 'google' } },
				],
			},
			{
				$entity: 'Account',
				provider: 'Microsoft',
				user: { name: 'Carla' },
			},
			{
				$tempId: '_:gh1',
				$op: 'create',
				$entity: 'Account',
				provider: 'github',
			},
			{
				$entity: 'Account',
				$tempId: '_:mm',
				$op: 'create',
				provider: 'metamask',
			},
			{
				$relation: 'User-Accounts',
				accounts: [{ $tempId: '_:mm', $op: 'link' }],
				user: { $tempId: '_:us1', $op: 'link' },
			},
		]);
		expect(res?.length).toBe(17);
	});

	it('c5[multi, create, link] tempIds in extended relation', async () => {
		expect(bormClient).toBeDefined();
		const res1 = await bormClient.mutate([
			{
				$entity: 'Space',
				$tempId: '_:Personal',
				$op: 'create',
				name: 'Personal',
			},
		]);

		const spaceId = (res1 as any)?.id as string;

		await bormClient.mutate([
			{
				$entity: 'Space',
				$id: spaceId,
				kinds: [
					{
						$op: 'create',
						$tempId: '_:person',
						name: 'person',
					},
				],
			},
		]);

		const spaceRes = await bormClient.query(
			{
				$entity: 'Space',
				$id: spaceId,
				$fields: ['kinds'],
			},
			{ noMetadata: true },
		);

		expect(spaceRes).toBeDefined();
		expect(spaceRes).toEqual({
			kinds: [expect.any(String)],
		});
	});

	it('r1[replace] replace single roles in relation', async () => {
		expect(bormClient).toBeDefined();
		// cardinality one
		await bormClient.mutate({
			$relation: 'ThingRelation',
			$id: 'tr2',
			root: 'thing4',
		});

		// cardinality many
		await bormClient.mutate({
			$relation: 'ThingRelation',
			$id: 'tr2',
			things: ['thing4'],
		});
		const queryRes = await bormClient.query(
			{
				$relation: 'ThingRelation',
				$id: 'tr2',
			},
			{ noMetadata: true },
		);

		expect(queryRes).toBeDefined();
		expect(queryRes).toEqual({
			id: 'tr2',
			things: ['thing4'],
			root: 'thing4',
			extra: 'thing1',
		});
	});

	it('r2[replace] replace many roles in relation', async () => {
		expect(bormClient).toBeDefined();

		await bormClient.mutate({
			$relation: 'ThingRelation',
			$id: 'tr3',
			root: 'thing4',
			things: ['thing4'],
		});

		const queryRes = await bormClient.query(
			{
				$relation: 'ThingRelation',
				$id: 'tr3',
			},
			{ noMetadata: true },
		);

		expect(queryRes).toBeDefined();
		expect(queryRes).toEqual({
			id: 'tr3',
			things: ['thing4'],
			root: 'thing4',
			extra: 'thing1',
		});
	});

	it('r3[replace] replace many roles in many relation', async () => {
		expect(bormClient).toBeDefined();

		await bormClient.mutate([
			{
				$relation: 'ThingRelation',
				$id: 'tr4',
				root: 'thing4',
				things: ['thing4'],
			},
			{
				$relation: 'ThingRelation',
				$id: 'tr5',
				root: 'thing4',
				things: ['thing4'],
			},
		]);

		const queryRes = await bormClient.query(
			{
				$relation: 'ThingRelation',
				$id: ['tr4', 'tr5'],
			},
			{ noMetadata: true },
		);

		expect(queryRes).toBeDefined();
		expect(queryRes).toEqual([
			{
				id: 'tr4',
				things: ['thing4'],
				root: 'thing4',
				extra: 'thing1',
			},
			{
				id: 'tr5',
				things: ['thing4'],
				root: 'thing4',
				extra: 'thing1',
			},
		]);
	});

	afterAll(async () => {
		await cleanup(dbName);
	});
});
