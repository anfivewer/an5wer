import {
  ZodArray,
  ZodBoolean,
  ZodEnum,
  ZodFirstPartyTypeKind,
  ZodLiteral,
  ZodNull,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodRawShape,
  ZodString,
  ZodTypeAny,
  ZodUndefined,
} from 'zod';
import {
  IModelType,
  ISimpleType,
  IArrayType,
  types,
  IAnyType,
  IMaybe,
  IMaybeNull,
} from 'mobx-state-tree';

type ZodUnknownKeysParam = 'passthrough' | 'strict' | 'strip';

type ZodToMst<T extends ZodTypeAny> = T extends ZodNumber
  ? ISimpleType<number>
  : T extends ZodString
  ? ISimpleType<string>
  : T extends ZodBoolean
  ? ISimpleType<boolean>
  : T extends ZodNull
  ? ISimpleType<null>
  : T extends ZodUndefined
  ? ISimpleType<undefined>
  : T extends ZodOptional<infer InnerT>
  ? IMaybe<ZodToMst<InnerT>>
  : T extends ZodNullable<infer InnerT>
  ? IMaybeNull<ZodToMst<InnerT>>
  : T extends ZodEnum<infer InnerT>
  ? ISimpleType<InnerT extends Array<infer Item> ? Item : unknown>
  : T extends ZodObject<infer A, infer B, infer C, infer D>
  ? ZodObjectToMst<A, B, C, D, T>
  : T extends ZodArray<infer InnerT>
  ? IArrayType<ZodToMst<InnerT>>
  : T extends ZodLiteral<infer InnerT>
  ? ISimpleType<InnerT>
  : ISimpleType<unknown>;

type ZodObjectToMst<
  ZodShape extends ZodRawShape,
  ZodUnknownKeys extends ZodUnknownKeysParam,
  ZodCatchAll extends ZodTypeAny,
  ZodOutput,
  T extends ZodObject<ZodShape, ZodUnknownKeys, ZodCatchAll, ZodOutput>,
> = IModelType<
  {
    [Key in keyof ZodShape]: ZodToMst<ZodShape[Key]>;
  },
  {
    runAction: (action: (node: T) => void) => void;
  }
>;

export const zodToMst = <T extends ZodTypeAny>(zodParser: T): ZodToMst<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function zodToMstInternal(zodDef: any): IAnyType {
    switch (zodDef.typeName) {
      case ZodFirstPartyTypeKind.ZodObject: {
        const shape = zodDef.shape();
        const mstShape: Record<string, IAnyType> = {};

        for (const [key, zod] of Object.entries(shape)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mstShape[key] = zodToMstInternal((zod as any)._def);
        }

        return types.model(mstShape).actions((self) => ({
          runAction: (action: (node: typeof self) => void) => {
            action(self);
          },
        }));
      }
      case ZodFirstPartyTypeKind.ZodString:
        return types.string;
      case ZodFirstPartyTypeKind.ZodNumber:
        return types.number;
      case ZodFirstPartyTypeKind.ZodArray:
        return types.array(zodToMst(zodDef.type));
      case ZodFirstPartyTypeKind.ZodEnum:
        return types.enumeration(zodDef.values);
      case ZodFirstPartyTypeKind.ZodNullable:
        return types.maybeNull(zodToMstInternal(zodDef.innerType._def));
      case ZodFirstPartyTypeKind.ZodOptional:
        return types.maybe(zodToMstInternal(zodDef.innerType._def));
      case ZodFirstPartyTypeKind.ZodLiteral:
        return types.literal(zodDef.value);
      default:
        throw new Error(`Unknown Zod type: ${zodDef.typeName}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return zodToMstInternal(zodParser._def) as any;
};
