import type { ObjectLiteral, Repository } from 'typeorm'

export interface UpsertConfig {
    conflictPaths: string[]
    conflictType?: 'ignore' | 'update'
}

export async function upsert<T extends ObjectLiteral>(repository: Repository<T>, data: T | T[], config: UpsertConfig) {
    const { conflictPaths, conflictType = 'update' } = config

    if (conflictType === 'update') {
        return repository.upsert(data, { conflictPaths, upsertType: 'on-conflict-do-update', skipUpdateIfNoValuesChanged: true })
    }

    return repository.createQueryBuilder().insert().orIgnore().into(repository.target).values(data).execute()
}
