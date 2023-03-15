const path = require('path');
const {exit} = require("process");
const fs = require('fs');
const yaml = require('yaml');

const workflowsDirectory = path.resolve(__dirname, '..', '..', '.github', 'workflows');
const workflowTestsDirectory = path.resolve(__dirname, '..');
const workflowTestMocksDirectory = path.join(workflowTestsDirectory, 'mocks');
const workflowTestAssertionsDirectory = path.join(workflowTestsDirectory, 'assertions');
const workflowFilePattern = '\\w+\\.yml';
const workflowFileRegex = new RegExp(workflowFilePattern, 'g');

const capitalize = s => (s && s.charAt(0).toUpperCase() + s.slice(1)) || '';
const mockFileTemplate = (mockSteps, exports) => `const utils = require('../utils/utils');

${mockSteps}
${exports}
`;
const assertionFileTemplate = (jobAssertions, exports) => `const utils = require('../utils/utils');
${jobAssertions}
${exports}
`;
const testFileTemplate = (workflowName) => `const path = require('path');
const kieMockGithub = require('@kie/mock-github');
const utils = require('./utils/utils');
const assertions = require('./assertions/${workflowName}Assertions');
const mocks = require('./mocks/${workflowName}Mocks');
const eAct = require('./utils/ExtendedAct');

let mockGithub;
const FILES_TO_COPY_INTO_TEST_REPO = [
    {
        src: path.resolve(__dirname, '..', '.github', 'actions'),
        dest: '.github/actions',
    },
    {
        src: path.resolve(__dirname, '..', '.github', 'libs'),
        dest: '.github/libs',
    },
    {
        src: path.resolve(__dirname, '..', '.github', 'scripts'),
        dest: '.github/scripts',
    },
    {
        src: path.resolve(__dirname, '..', '.github', 'workflows', '${workflowName}.yml'),
        dest: '.github/workflows/${workflowName}.yml',
    },
];

beforeEach(async () => {
    // create a local repository and copy required files
    mockGithub = new kieMockGithub.MockGithub({
        repo: {
            test${capitalize(workflowName)}WorkflowRepo: {
                files: FILES_TO_COPY_INTO_TEST_REPO,
                
                // if any branches besides main are need add: pushedBranches: ['staging', 'production'],
            },
        },
    });

    await mockGithub.setup();
});

afterEach(async () => {
    await mockGithub.teardown();
});

describe('test workflow ${workflowName}', () => {
    test('test stub', async () => {
        const repoPath = mockGithub.repo.getPath('test${capitalize(workflowName)}WorkflowRepo') || '';
        const workflowPath = path.join(repoPath, '.github', 'workflows', '${workflowName}.yml');
        let act = new eAct.ExtendedAct(repoPath, workflowPath);
        act = utils.setUpActParams(
            act,
            
            // set up params if needed
        );
        const testMockSteps = {
            // mock steps with imported mocks
        };
        const result = await act
            .runEvent('[EVENT]', {
                workflowFile: path.join(repoPath, '.github', 'workflows'),
                mockSteps: testMockSteps,
                actor: 'Dummy Author',
            });
            
        // assert execution with imported assertions
    }, 60000);
});
`;
const mockStepTemplate = (stepMockName, step, jobId) => `
const ${stepMockName} = utils.getMockStep(
    '${step.name || ''}',
    '${step.name || ''}',
    ${jobId ? `'${jobId.toUpperCase()}'` : 'null'},
    ${step.inputs ? JSON.stringify(step.inputs).replaceAll('"', "'") : 'null'},
    ${step.envs ? JSON.stringify(step.envs).replaceAll('"', "'") : 'null'},
    // add outputs if needed
);`;
const stepAssertionTemplate = (step_name, job_id, step_message, inputs, envs) => `
        utils.getStepAssertion(
            '${step_name}',
            true,
            null,
            '${job_id}',
            '${step_message}',
            [${inputs.map((input) => `{key: '${input}', value: '[FILL_IN]'}`)}],
            [${envs.map((env) => `{key: '${env}', value: '[FILL_IN]'}`)}],
        ),`;
const jobMocksTemplate = (jobMocksName, stepMocks) => `
const ${jobMocksName} = [${stepMocks.map((stepMock) => `
    ${stepMock}`)}
];`;
const jobAssertionTemplate = (jobAssertionName, stepAssertions) => `
const ${jobAssertionName} = (workflowResult, didExecute = true) => {
    const steps = [${stepAssertions}
    ];

    for (const expectedStep of steps) {
        if (didExecute) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }
};`;
const mocksExportsTemplate = (jobMocks) => `
module.exports = {
    ${jobMocks.map((jobMock) => `${jobMock},`)}
};`;
const assertionsExportsTemplate = (jobAssertions) => `
module.exports = {
    ${jobAssertions.map((jobAssertion) => `${jobAssertion},`)}
};`;

const checkArguments = (args) => {
    if (args.length === 0 || !args[0]) {
        console.warn('Please provide workflow file name');
        exit(1);
    }
};
const checkWorkflowFileName = (fileName) => {
    if (!workflowFileRegex.test(fileName)) {
        console.warn(`Please provide a valid workflow file name ([workflow].yml) instead of ${fileName}`);
        exit(1);
    }
};
const checkWorkflowFilePath = (filePath) => {
    if (!fs.existsSync(filePath)) {
        console.warn(`Provided workflow file does not exist: ${filePath}`);
        exit(1);
    }
};
const checkIfTestFileDoesNotExist = (testsDirectory, testFileName) => {
    if (fs.existsSync(path.join(testsDirectory, testFileName))) {
        console.warn(`The test file ${testFileName} already exists, exiting`);
        exit(1);
    }
}
const checkIfMocksFileDoesNotExist = (mocksDirectory, mocksFileName) => {
    if (fs.existsSync(path.join(mocksDirectory, mocksFileName))) {
        console.warn(`The mocks file ${mocksFileName} already exists, exiting`);
        exit(1);
    }
}
const checkIfAssertionsFileDoesNotExist = (assertionsDirectory, assertionsFileName) => {
    if (fs.existsSync(path.join(assertionsDirectory, assertionsFileName))) {
        console.warn(`The assertions file ${assertionsFileName} already exists, exiting`);
        exit(1);
    }
}
const parseWorkflowFile = (workflow) => {
    const workflowJobs = {};
    for (const [jobId, job] of Object.entries(workflow.jobs)) {
        workflowJobs[jobId] = {
            steps: [],
        };
        for (const step of job.steps) {
            const workflowStep = {
                name: step.name || '',
                inputs: Object.keys(step.with || {}) || [],
                envs: Object.keys(step.env || {}) || [],
            }
            workflowJobs[jobId].steps.push(workflowStep);
        }
    }
    return workflowJobs;
};
const getMockFileContent = (workflowName, jobs) => {
    let content = '';
    const jobMocks = [];
    for (const [jobId, job] of Object.entries(jobs)) {
        let mockStepsContent = `// ${jobId.toLowerCase()}`;
        const stepMocks = [];
        for (const step of job.steps) {
            const stepMockName = `${workflowName.toUpperCase()}__${jobId.toUpperCase()}__${step.name.replaceAll(' ', '_').toUpperCase()}__STEP_MOCK`;
            stepMocks.push(stepMockName);
            mockStepsContent += mockStepTemplate(stepMockName, step, jobId);
        }
        const jobMocksName = `${workflowName.toUpperCase()}__${jobId.toUpperCase()}__STEP_MOCKS`;
        jobMocks.push(jobMocksName);
        mockStepsContent += jobMocksTemplate(jobMocksName, stepMocks);
        content += mockStepsContent;
    }
    return mockFileTemplate(content, mocksExportsTemplate(jobMocks));
};
const getAssertionsFileContent = (workflowName, jobs) => {
    let content = '';
    const jobAssertions = [];
    for (const [jobId, job] of Object.entries(jobs)) {
        let stepAssertionsContent = '';
        for (const step of job.steps) {
            stepAssertionsContent += stepAssertionTemplate(step.name, jobId.toUpperCase(), step.name, step.inputs, step.envs);
        }
        const jobAssertionName = `assert${jobId}JobExecuted`;
        jobAssertions.push(jobAssertionName);
        content += jobAssertionTemplate(jobAssertionName, stepAssertionsContent);
    }
    return assertionFileTemplate(content, assertionsExportsTemplate(jobAssertions));
};
const getTestFileContent = (workflowName) => {
    return testFileTemplate(workflowName);
};

const arguments = process.argv.slice(2);
checkArguments(arguments);

const workflowFileName = arguments[0];
checkWorkflowFileName(workflowFileName);

const workflowName = workflowFileName.slice(0, -4);
const workflowFilePath = path.join(workflowsDirectory, workflowFileName);
checkWorkflowFilePath(workflowFilePath);

const workflowTestFileName = `${workflowName}.test.js`;
checkIfTestFileDoesNotExist(workflowTestsDirectory, workflowTestFileName);

const workflowTestMocksFileName = `${workflowName}Mocks.js`;
checkIfMocksFileDoesNotExist(workflowTestMocksDirectory, workflowTestMocksFileName);

const workflowTestAssertionsFileName = `${workflowName}Assertions.js`;
checkIfAssertionsFileDoesNotExist(workflowTestAssertionsDirectory, workflowTestAssertionsFileName);

const workflow = yaml.parse(fs.readFileSync(workflowFilePath, 'utf8'));
const workflowJobs = parseWorkflowFile(workflow);

const mockFileContent = getMockFileContent(workflowName, workflowJobs);
const mockFilePath = path.join(workflowTestMocksDirectory, workflowTestMocksFileName);
console.log(`Creating mock file ${mockFilePath}`);
fs.writeFileSync(mockFilePath, mockFileContent);
console.log(`Mock file ${mockFilePath} created`);

const assertionsFileContent = getAssertionsFileContent(workflowName, workflowJobs);
const assertionsFilePath = path.join(workflowTestAssertionsDirectory, workflowTestAssertionsFileName);
console.log(`Creating assertions file ${assertionsFilePath}`);
fs.writeFileSync(assertionsFilePath, assertionsFileContent);
console.log(`Assertions file ${assertionsFilePath} created`);

const testFileContent = getTestFileContent(workflowName, workflowJobs);
const testFilePath = path.join(workflowTestsDirectory, workflowTestFileName);
console.log(`Creating test file ${testFilePath}`);
fs.writeFileSync(testFilePath, testFileContent);
console.log(`Test file ${testFilePath} created`);