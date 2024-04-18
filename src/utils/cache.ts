import { sleep } from '@kdt310722/utils/promise'

export class Cache<T = unknown> extends Map<string, T> {
    public setWithExpire(key: string, value: T, ttl: number) {
        super.set(key, value)
        sleep(ttl).then(() => this.delete(key))
    }
}
