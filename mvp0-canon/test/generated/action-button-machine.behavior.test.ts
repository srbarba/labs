// Deliberately outside packages/ui/: that whole tree is deleted and rebuilt
// by `pnpm generate` (see the structural rule in section 4 of the plan), so
// nothing hand-written can live inside it. This file imports the generated
// machine from its build location instead.
import { describeActionButtonMachineBehaviour } from "../shared/action-button-machine.behavior";
import { actionButtonMachine } from "../../packages/ui/src/actionButton/machine";

describeActionButtonMachineBehaviour("generated (Fase 3)", actionButtonMachine);
