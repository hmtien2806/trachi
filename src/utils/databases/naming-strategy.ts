import plularize from 'pluralize'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

export class NamingStrategy extends SnakeNamingStrategy {
    public override tableName(className: string, customName: string): string {
        if (customName?.length) {
            return super.tableName(className, customName)
        }

        return plularize(super.tableName(className, customName))
    }
}
