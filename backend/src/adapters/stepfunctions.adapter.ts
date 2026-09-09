/**
 * Step Functions Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: AWS Step Functions
 * ----------------------------------------
 * 1. Open AWS Console -> Step Functions -> Create State Machine
 * 2. Standard State Machine -> Paste definition JSON from infrastructure/template.yaml
 * 3. Name: reconcilo-reconciliation-workflow
 * 4. Replace this stub implementation with `@aws-sdk/client-sfn`
 */

export interface WorkflowExecution {
  executionArn: string;
  stateMachineArn: string;
  input: Record<string, any>;
  startDate: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
}

const mockExecutions: WorkflowExecution[] = [];

export class StepFunctionsAdapter {
  /**
   * Triggers execution of the reconciliation Step Functions state machine.
   * // TODO: Replace stub with real AWS SDK StepFunctions StartExecutionCommand
   */
  static async startExecution(
    stateMachineArn: string,
    input: Record<string, any>
  ): Promise<{ success: boolean; executionArn: string }> {
    const executionArn = `${stateMachineArn}:execution-${Date.now()}`;
    const execution: WorkflowExecution = {
      executionArn,
      stateMachineArn,
      input,
      startDate: new Date().toISOString(),
      status: 'SUCCEEDED',
    };

    mockExecutions.push(execution);
    console.log(`[STEP FUNCTIONS STUB] Workflow execution started: ${executionArn}`);

    return { success: true, executionArn };
  }

  /**
   * Helper to retrieve workflow executions in test assertions.
   */
  static getExecutions(): WorkflowExecution[] {
    return [...mockExecutions];
  }

  /**
   * Clears mock executions.
   */
  static resetMockExecutions(): void {
    mockExecutions.length = 0;
  }
}
