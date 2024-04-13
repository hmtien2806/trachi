export class LruMap<T = unknown> extends Map<string, T> {
    public constructor(public readonly maxSize: number) {
        super()
    }

    public override set(key: string, value: T) {
        super.set(key, value)

        if (this.maxSize && this.size > this.maxSize) {
            this.delete(this.keys().next().value)
        }

        return this
    }
}
