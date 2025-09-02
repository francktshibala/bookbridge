export enum Directory {
  Data = 'Data',
  Documents = 'Documents',
  Cache = 'Cache',
}

export enum Encoding {
  UTF8 = 'utf8',
}

export const Filesystem = {
  writeFile: async (_options: any) => ({ uri: '' }),
  readFile: async (_options: any) => ({ data: '' }),
  deleteFile: async (_options: any) => ({}),
  readdir: async (_options: any) => ({ files: [] as { name: string }[] }),
};

export default { Filesystem, Directory, Encoding };


