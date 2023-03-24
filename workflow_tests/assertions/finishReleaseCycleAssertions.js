const utils = require('../utils/utils');

const assertValidateJobExecuted = (workflowResult, username = 'Dummy Author', issueNumber = '', didExecute = true, isTeamMember = true, hasBlockers = false) => {
    const steps = [
        utils.getStepAssertion(
            'Validate actor is deployer',
            true,
            null,
            'VALIDATE',
            'Validating if actor is deployer',
            [
                {key: 'GITHUB_TOKEN', value: '***'},
                {key: 'username', value: username},
                {key: 'team', value: 'mobile-deployers'},
            ],
            [],
        ),
    ];
    if (isTeamMember) {
        steps.push(
            utils.getStepAssertion(
                'Check for any deploy blockers',
                true,
                null,
                'VALIDATE',
                'Checking for deploy blockers',
                [
                    {key: 'GITHUB_TOKEN', value: '***'},
                    {key: 'ISSUE_NUMBER', value: issueNumber},
                ],
                [],
            ),
        );
    }

    for (const expectedStep of steps) {
        if (didExecute) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }

    // eslint-disable-next-line rulesdir/no-negated-variables
    const notTeamMemberSteps = [
        utils.getStepAssertion(
            'Reopen and comment on issue (not a team member)',
            true,
            null,
            'VALIDATE',
            'Reopening issue - not a team member',
            [
                {key: 'GITHUB_TOKEN', value: '***'},
                {key: 'ISSUE_NUMBER', value: issueNumber},
                {key: 'COMMENT', value: 'Sorry, only members of @Expensify/Mobile-Deployers can close deploy checklists.\nReopening!'},
            ],
            [],
        ),
    ];

    for (const expectedStep of notTeamMemberSteps) {
        if (didExecute && !isTeamMember) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }

    const blockerSteps = [
        utils.getStepAssertion(
            'Reopen and comment on issue (has blockers)',
            true,
            null,
            'VALIDATE',
            'Reopening issue - blockers',
            [
                {key: 'GITHUB_TOKEN', value: '***'},
                {key: 'ISSUE_NUMBER', value: issueNumber},
            ],
            [],
        ),
    ];

    for (const expectedStep of blockerSteps) {
        if (didExecute && hasBlockers) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }
};

const assertUpdateProductionJobExecuted = (workflowResult, didExecute = true) => {
    const steps = [
        utils.getStepAssertion(
            'Update production branch',
            true,
            null,
            'UPDATEPRODUCTION',
            'Updating production branch',
            [
                {key: 'TARGET_BRANCH', value: 'production'},
                {key: 'OS_BOTIFY_TOKEN', value: '***'},
                {key: 'GPG_PASSPHRASE', value: '***'},
            ],
            [],
        ),
    ];

    for (const expectedStep of steps) {
        if (didExecute) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }
};

const assertCreateNewPatchVersionJobExecuted = (workflowResult, didExecute = true) => {
    const steps = [
        utils.getStepAssertion(
            'Create new version',
            true,
            null,
            'CREATENEWPATCHVERSION',
            'Creating new version',
            [{key: 'SEMVER_LEVEL', value: 'PATCH'}],
            [],
        ),
    ];

    for (const expectedStep of steps) {
        if (didExecute) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }
};

const assertCreateNewStagingDeployCashJobExecuted = (workflowResult, newVersion = '', didExecute = true, isSuccessful = true) => {
    const steps = [
        utils.getStepAssertion(
            'Update staging branch to trigger staging deploy',
            true,
            null,
            'CREATENEWSTAGINGDEPLOYCASH',
            'Updating staging branch',
            [
                {key: 'TARGET_BRANCH', value: 'staging'},
                {key: 'OS_BOTIFY_TOKEN', value: '***'},
                {key: 'GPG_PASSPHRASE', value: '***'},
            ],
            [],
        ),
        utils.getStepAssertion(
            'Tag version',
            true,
            null,
            'CREATENEWSTAGINGDEPLOYCASH',
            'Tagging version',
            [],
            [],
        ),
        utils.getStepAssertion(
            'Create new StagingDeployCash',
            true,
            null,
            'CREATENEWSTAGINGDEPLOYCASH',
            'Creating new StagingDeployCash',
            [
                {key: 'GITHUB_TOKEN', value: '***'},
                {key: 'NPM_VERSION', value: newVersion},
            ],
            [],
        ),
    ];

    if (!isSuccessful) {
        steps[2].status = 1;
    }

    for (const expectedStep of steps) {
        if (didExecute) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }

    const failProdSteps = [
        utils.getStepAssertion(
            'Announce failed workflow in Slack',
            true,
            null,
            'CREATENEWSTAGINGDEPLOYCASH',
            'Announcing failed workflow',
            [{key: 'SLACK_WEBHOOK', value: '***'}],
            [],
        ),
    ];

    for (const expectedStep of failProdSteps) {
        if (didExecute && !isSuccessful) {
            expect(workflowResult).toEqual(expect.arrayContaining([expectedStep]));
        } else {
            expect(workflowResult).not.toEqual(expect.arrayContaining([expectedStep]));
        }
    }
};

module.exports = {
    assertValidateJobExecuted,
    assertUpdateProductionJobExecuted,
    assertCreateNewPatchVersionJobExecuted,
    assertCreateNewStagingDeployCashJobExecuted,
};