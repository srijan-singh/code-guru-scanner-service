export interface ChunkData {
  className: string;
  methodName: string;
  returnType: string;
  parameters: string[];
  calledBy: string[]; // Classes/methods that call this method
  dependencies: string[]; // Classes/methods this method depends on (calling them) - placeholder for now
  methodCode: string;
}
