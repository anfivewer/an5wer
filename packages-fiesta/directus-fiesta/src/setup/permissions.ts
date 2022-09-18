import {deepEquals} from '@-/util/src/object/deep-equals';
import {
  array,
  literal,
  object,
  string,
  unknown,
  infer as Infer,
  number,
  nullable,
  optional,
} from 'zod';
import {FiestaDirectus} from '../types';

export const setupPermissions = async ({
  directus,
}: {
  directus: FiestaDirectus;
}) => {
  const setPermissions = async ({
    collection,
    permissions,
  }: {
    collection: string;
    permissions: Omit<Permission, 'collection'>[];
  }) => {
    const result = await directus.permissions.readByQuery({
      filter: {collection: {_eq: collection}},
    });

    const existingPermissions = DirectusPermissions.parse(result.data);

    await Promise.all(
      permissions.map((permission) =>
        setPermission({
          directus,
          existingPermissions,
          permission: {
            ...permission,
            collection,
          },
        }),
      ),
    );
  };

  await Promise.all([
    setPermissions({
      collection: 'events',
      permissions: [
        {
          role: null,
          action: 'read',
          permissions: {},
          fields: ['*'],
        },
      ],
    }),
    setPermissions({
      collection: 'events_directus_files',
      permissions: [
        {
          role: null,
          action: 'read',
          permissions: {},
          fields: ['*'],
        },
      ],
    }),
    setPermissions({
      collection: 'directus_files',
      permissions: [
        {
          role: null,
          action: 'read',
          permissions: {_and: [{folder: {name: {_eq: 'public'}}}]},
        },
      ],
    }),
  ]);
};

const Permission = object({
  role: literal(null),
  collection: string(),
  action: literal('read'),
  permissions: unknown(),
  fields: optional(nullable(array(string()))),
});
type Permission = Infer<typeof Permission>;

const DirectusPermissions = array(
  Permission.extend({
    id: number(),
  }).passthrough(),
);
type DirectusPermissions = Infer<typeof DirectusPermissions>;

const setPermission = async ({
  directus,
  existingPermissions,
  permission,
}: {
  directus: FiestaDirectus;
  existingPermissions: DirectusPermissions;
  permission: Permission;
}) => {
  const {role, collection, action} = permission;

  const existingPermission = existingPermissions.find(
    (x) =>
      x.role === role && x.collection === collection && x.action === action,
  );

  if (deepEquals(permission.permissions, existingPermission?.permissions)) {
    return;
  }

  if (existingPermission) {
    await directus.permissions.updateOne(existingPermission.id, permission);
  } else {
    await directus.permissions.createOne(permission);
  }
};
