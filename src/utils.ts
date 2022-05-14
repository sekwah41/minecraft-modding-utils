import {runConvertModel} from "./convert-legacy-model";


const args = process.argv;
args.splice(0,2);

const commands: {
    [prop: string]: ((...args: string[]) => number) | undefined;
} = {
    updatemodel: runConvertModel
};

function run() {
    if(args.length > 0) {
        const command = args.splice(0,1);

        const currentCommand = command[0];

        if(currentCommand) {
            const branch = commands[currentCommand];

            if(branch) {
                return branch();
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