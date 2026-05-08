export class AuthenticationError extends Error {
  readonly code = "AuthenticationError";
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly code = "AuthorizationError";
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class RateLimitedError extends Error {
  readonly code = "RateLimitedError";
  readonly resetAt: Date;
  constructor(resetAt: Date) {
    super(`Rate limited until ${resetAt.toISOString()}`);
    this.name = "RateLimitedError";
    this.resetAt = resetAt;
  }
}

export class GraphqlValidationError extends Error {
  readonly code = "GraphqlValidationError";
  constructor(message: string) {
    super(message);
    this.name = "GraphqlValidationError";
  }
}

export class GraphqlExecutionError extends Error {
  readonly code = "GraphqlExecutionError";
  constructor(message: string) {
    super(message);
    this.name = "GraphqlExecutionError";
  }
}
