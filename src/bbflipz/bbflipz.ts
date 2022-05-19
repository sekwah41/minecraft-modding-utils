`use strict`;

import * as fs from 'fs';
import * as path from 'path';

function fixData(data: { rotation: any[]; children: any[]; }) {
    if(data.rotation) {
        data.rotation = [data.rotation[0], data.rotation[1], -data.rotation[2]];
    }
    if(data.children) {
        data.children.forEach(child => {
            if(typeof child !== "string") {
                fixData(child);
            }
        });
    }
}

/**
 * The main bulk of the logic
 * @param fileContents the raw java file to pull info from
 */
function convertContents(fileContents: string) {
    const model = JSON.parse(fileContents);

    fixData(model.outliner[0]);

    return JSON.stringify(model);
}


export function runFlipZ(...args: string[]) {
    if(args.length === 0) {
        console.log("No arguments provided")
        process.exit(-1);
    }
    for(let fileLocation of args) {
        const fileContents = fs.readFileSync(fileLocation).toString();
        const newFileName = `${path.parse(fileLocation).name}ZFlipped.bbmodel`;
        fs.writeFileSync(path.join(path.dirname(fileLocation), newFileName) ,convertContents(fileContents));
    }
    return 0;
}
