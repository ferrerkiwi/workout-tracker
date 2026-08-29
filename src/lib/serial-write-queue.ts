/** Serializes asynchronous writes while allowing later writes after a failure. */
export class SerialWriteQueue {
  private tail: Promise<void> = Promise.resolve()

  enqueue<T>(write: () => Promise<T>): Promise<T> {
    const result = this.tail.then(write)
    this.tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  flush(): Promise<void> {
    return this.tail
  }
}
