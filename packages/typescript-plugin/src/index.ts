import { dirname, resolve } from 'path';
import { decorateLanguageService, isPatched } from './language-service';
import { Logger } from './logger';
import { patchModuleLoader } from './module-loader';
import { HamberSnapshotManager } from './hamber-snapshots';
import type ts from 'typescript/lib/tsserverlibrary';
import { ConfigManager, Configuration } from './config-manager';
import { ProjectHamberFilesManager } from './project-hamber-files';
import { getConfigPathForProject } from './utils';

function init(modules: { typescript: typeof ts }): ts.server.PluginModule {
    const configManager = new ConfigManager();

    function create(info: ts.server.PluginCreateInfo) {
        const logger = new Logger(info.project.projectService.logger);
        if (!isHamberProject(info.project.getCompilerOptions())) {
            logger.log('Detected that this is not a Hamber project, abort patching TypeScript');
            return info.languageService;
        }

        if (isPatched(info.languageService)) {
            logger.log('Already patched. Checking tsconfig updates.');

            ProjectHamberFilesManager.getInstance(
                info.project.getProjectName()
            )?.updateProjectConfig(info.languageServiceHost);

            return info.languageService;
        }

        configManager.updateConfigFromPluginConfig(info.config);
        if (configManager.getConfig().enable) {
            logger.log('Starting Hamber plugin');
        } else {
            logger.log('Hamber plugin disabled');
            logger.log(info.config);
        }

        // This call the ConfiguredProject.getParsedCommandLine
        // where it'll try to load the cached version of the parsedCommandLine
        const parsedCommandLine = info.languageServiceHost.getParsedCommandLine?.(
            getConfigPathForProject(info.project)
        );

        const hamberOptions = parsedCommandLine?.raw?.hamberOptions || { namespace: 'hamberHTML' };
        logger.log('hamberOptions:', hamberOptions);
        logger.debug(parsedCommandLine?.wildcardDirectories);

        const snapshotManager = new HamberSnapshotManager(
            modules.typescript,
            info.project.projectService,
            hamberOptions,
            logger,
            configManager
        );

        const projectHamberFilesManager = parsedCommandLine
            ? new ProjectHamberFilesManager(
                  modules.typescript,
                  info.project,
                  info.serverHost,
                  snapshotManager,
                  parsedCommandLine,
                  configManager
              )
            : undefined;

        patchModuleLoader(
            logger,
            snapshotManager,
            modules.typescript,
            info.languageServiceHost,
            info.project,
            configManager
        );

        configManager.onConfigurationChanged(() => {
            // enabling/disabling the plugin means TS has to recompute stuff
            info.languageService.cleanupSemanticCache();
            info.project.markAsDirty();

            // updateGraph checks for new root files
            // if there's no tsconfig there isn't root files to check
            if (projectHamberFilesManager) {
                info.project.updateGraph();
            }
        });

        return decorateLanguageServiceDispose(
            decorateLanguageService(info.languageService, snapshotManager, logger, configManager),
            projectHamberFilesManager ?? {
                dispose() {}
            }
        );
    }

    function getExternalFiles(project: ts.server.Project) {
        if (!isHamberProject(project.getCompilerOptions()) || !configManager.getConfig().enable) {
            return [];
        }

        // Needed so the ambient definitions are known inside the tsx files
        const hamberTsPath = dirname(require.resolve('hamber2tsx'));
        const hamberTsxFiles = [
            './hamber-shims.d.ts',
            './hamber-jsx.d.ts',
            './hamber-native-jsx.d.ts'
        ].map((f) => modules.typescript.sys.resolvePath(resolve(hamberTsPath, f)));

        // let ts know project hamber files to do its optimization
        return hamberTsxFiles.concat(
            ProjectHamberFilesManager.getInstance(project.getProjectName())?.getFiles() ?? []
        );
    }

    function isHamberProject(compilerOptions: ts.CompilerOptions) {
        // Add more checks like "no Hamber file found" or "no config file found"?
        try {
            const isHamberProject =
                typeof compilerOptions.configFilePath !== 'string' ||
                require.resolve('hamber', { paths: [compilerOptions.configFilePath] });
            return isHamberProject;
        } catch (e) {
            // If require.resolve fails, we end up here
            return false;
        }
    }

    function onConfigurationChanged(config: Configuration) {
        configManager.updateConfigFromPluginConfig(config);
    }

    function decorateLanguageServiceDispose(
        languageService: ts.LanguageService,
        disposable: { dispose(): void }
    ) {
        const dispose = languageService.dispose;

        languageService.dispose = () => {
            disposable.dispose();
            dispose();
        };

        return languageService;
    }

    return { create, getExternalFiles, onConfigurationChanged };
}

export = init;
