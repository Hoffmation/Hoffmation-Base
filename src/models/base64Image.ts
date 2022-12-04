export class Base64Image {
  public constructor(public data: string, public name: string, public type: string = 'image/jpg') {
  }

  public get buffer(): Buffer {
    return Buffer.from(this.data, 'base64');
  }
}
