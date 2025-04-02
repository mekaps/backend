"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@heroku-cli/command");
const core_1 = require("@oclif/core");
const color_1 = require("@heroku-cli/color");
const output_1 = require("../../lib/releases/output");
const releases_1 = require("../../lib/releases/releases");
class Retry extends command_1.Command {
    async run() {
        var _a;
        const { flags } = await this.parse(Retry);
        const { app } = flags;
        const release = await (0, releases_1.findByLatestOrId)(this.heroku, app);
        const { body: formations } = await this.heroku.get(`/apps/${app}/formation`);
        const releasePhase = formations.filter(formation => formation.type === 'release');
        if (!release) {
            return core_1.ux.error('No release found for this app.');
        }
        if (releasePhase.length === 0) {
            return core_1.ux.error('App must have a release-phase command to use this command.');
        }
        core_1.ux.action.start(`Retrying ${color_1.default.green('v' + release.version)} on ${color_1.default.app(app)}`);
        const { body: retry } = await this.heroku.post(`/apps/${app}/releases`, {
            body: {
                slug: (_a = release === null || release === void 0 ? void 0 : release.slug) === null || _a === void 0 ? void 0 : _a.id,
                description: `Retry of v${release.version}: ${release.description}`,
            },
        });
        core_1.ux.action.stop(`done, ${color_1.default.green('v' + retry.version)}`);
        if (retry.output_stream_url) {
            core_1.ux.log('Running release command...');
            await (0, output_1.stream)(retry.output_stream_url)
                .catch(error => {
                var _a;
                if (error.statusCode === 404 || ((_a = error.response) === null || _a === void 0 ? void 0 : _a.statusCode) === 404) {
                    core_1.ux.warn(`Release command starting. Use ${color_1.default.cmd('heroku releases:output --app ' + app)} to view the log.`);
                    return;
                }
                throw error;
            });
        }
    }
}
exports.default = Retry;
Retry.topic = 'releases';
Retry.description = 'retry the latest release-phase command';
Retry.examples = ['heroku releases:retry --app happy-samurai-42'];
Retry.help = 'Copies the latest release into a new release and retries the latest release-phase command. App must have a release-phase command.';
Retry.flags = {
    app: command_1.flags.app({ required: true }),
};
