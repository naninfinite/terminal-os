export const FILEMAN_COMMAND_EVENT = 'terminalos:fileman:command';

export type FileManCommandId = 'new_file' | 'new_folder';

export type FileManCommandDetail = {
  id: FileManCommandId;
};
