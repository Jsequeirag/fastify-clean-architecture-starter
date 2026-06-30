export class Result<T, E = Error> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E,
    private readonly _isSuccess: boolean = true
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result(value, undefined, true) as Result<T, never>;
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result(undefined, error, false) as Result<never, E>;
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from a failed result');
    }
    return this._value!;
  }

  get error(): E {
    if (this._isSuccess) {
      throw new Error('Cannot get error from a successful result');
    }
    return this._error!;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this._isSuccess ? Result.ok(fn(this._value!)) : Result.fail(this._error!);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this._isSuccess ? fn(this._value!) : Result.fail(this._error!);
  }
}
