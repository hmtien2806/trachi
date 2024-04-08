export function isValidName(input: string, prefix: string, checker: (value: string) => boolean) {
    const chunks = input.split(':')

    if (chunks.length !== 2) {
        return false
    }

    return chunks[0] === prefix && checker(chunks[1])
}
