export const PASSWORD_FAILURE_MESSAGE = "We could not update your password. Use Forgot password on the login page";

export function passwordUpdateOutcome(failed: boolean) {
  return { allowContinue: failed, clearMustChangePassword: !failed };
}