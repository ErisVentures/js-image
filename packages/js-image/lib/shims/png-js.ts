export class PNG {
  public static get sync(): any {
    return {
      read(): any {
        throw new Error('Unimplemented')
      },
      write(): any {
        throw new Error('Unimplemented')
      },
    }
  }
}
