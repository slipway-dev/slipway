import type { ErrorObject } from "ajv"

/** Precompiled from task-schema.json by scripts/build-validators.mjs. */
interface ValidateFunction {
  (data: unknown): boolean
  errors?: ErrorObject[] | null
}

export const validate: ValidateFunction
export default validate
