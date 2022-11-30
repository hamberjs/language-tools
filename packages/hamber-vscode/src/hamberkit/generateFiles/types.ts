export enum CommandType {
    PAGE = 'hamber.kit.generatePage',
    PAGE_LOAD = 'hamber.kit.generatePageLoad',
    PAGE_SERVER = 'hamber.kit.generatePageServerLoad',
    LAYOUT = 'hamber.kit.generateLayout',
    LAYOUT_LOAD = 'hamber.kit.generateLayoutLoad',
    LAYOUT_SERVER = 'hamber.kit.generateLayoutServerLoad',
    SERVER = 'hamber.kit.generateServer',
    ERROR = 'hamber.kit.generateError',
    MULTIPLE = 'hamber.kit.generateMultipleFiles'
}

export enum FileType {
    SCRIPT,
    PAGE
}

export enum ResourceType {
    PAGE,
    PAGE_LOAD,
    PAGE_SERVER,
    LAYOUT,
    LAYOUT_LOAD,
    LAYOUT_SERVER,
    SERVER,
    ERROR
}

export type Resource = {
    type: FileType;
    filename: string;
    generate: (config: GenerateConfig) => Promise<string>;
};

export interface GenerateConfig {
    path: string;
    typescript: boolean;
    pageExtension: string;
    scriptExtension: string;
    resources: Resource[];
}
