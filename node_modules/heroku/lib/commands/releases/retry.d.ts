import { Command } from '@heroku-cli/command';
export default class Retry extends Command {
    static topic: string;
    static description: string;
    static examples: string[];
    static help: string;
    static flags: {
        app: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces/parser").CustomOptions>;
    };
    run(): Promise<void>;
}
