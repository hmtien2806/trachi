export class LruSet<T = unknown> extends Set<T> {
    public constructor(public readonly maxSize: number) {
        super()
    }

    public override add(value: T) {
        super.add(value)

        if (this.maxSize && this.size > this.maxSize) {
            this.delete(this.values().next().value)
        }

        return this
    }

    public first(): T | undefined {
        return this.values().next().value
    }

    public last() {
        return [...this.values()].at(-1)
    }
}
