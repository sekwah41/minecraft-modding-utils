import {runConvertModel} from "./modelupdate/convert-legacy-model";
import {runFlipZ} from "./bbflipz/bbflipz";


const args = process.argv;
args.splice(0,2);

const commands: {
    [prop: string]: ((...args: string[]) => number) | undefined;
} = {
    updatemodel: runConvertModel,
    bbflipz: runFlipZ,
};

function run() {
    if(args.length > 0) {
        const command = args.splice(0,1);

        const currentCommand = command[0];

        if(currentCommand) {
            const branch = commands[currentCommand];

            if(branch) {
                return branch(...args);
            } else {
                console.log(`Invalid option, valid options include (${Object.keys(commands).join(", ")})`);
                return 1;
            }
        }
    } else {
        console.log(`Invalid option, valid options include (${Object.keys(commands).join(", ")})`);
        return 1;
    }

}

process.exit(run());