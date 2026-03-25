import fs from "node:fs";
import path from "node:path";

const appRoot = process.cwd();
const repoRoot = path.resolve(appRoot, "..");
const contractsRoot = path.join(repoRoot, "contracts");
const generatedRoot = path.join(appRoot, "src", "lib", "generated");
const requireArtifacts = process.argv.includes("--require");

const payrollArtifactPath = path.join(
  contractsRoot,
  "artifacts",
  "contracts",
  "ConfidentialPayroll.sol",
  "ConfidentialPayroll.json",
);
const mockQueryDecrypterArtifactPath = path.join(
  contractsRoot,
  "artifacts",
  "@fhenixprotocol",
  "cofhe-mock-contracts",
  "MockQueryDecrypter.sol",
  "MockQueryDecrypter.json",
);
const localhostDeploymentPath = path.join(
  contractsRoot,
  "deployments",
  "localhost.json",
);
const arbitrumSepoliaDeploymentPath = path.join(
  contractsRoot,
  "deployments",
  "arb-sepolia.json",
);

const requiredPaths = [
  payrollArtifactPath,
  mockQueryDecrypterArtifactPath,
  localhostDeploymentPath,
  arbitrumSepoliaDeploymentPath,
];

const missingPaths = requiredPaths.filter(
  (requiredPath) => !fs.existsSync(requiredPath),
);

if (missingPaths.length > 0) {
  const message = missingPaths
    .map((requiredPath) => `Missing required contracts file: ${requiredPath}`)
    .join("\n");

  if (requireArtifacts) {
    throw new Error(message);
  }

  console.warn(message);
  console.warn(
    "Skipping contract sync because build artifacts are not available yet.",
  );
  process.exit(0);
}

const payrollArtifact = JSON.parse(fs.readFileSync(payrollArtifactPath, "utf8"));
const mockQueryDecrypterArtifact = JSON.parse(
  fs.readFileSync(mockQueryDecrypterArtifactPath, "utf8"),
);
const localhostDeployment = JSON.parse(
  fs.readFileSync(localhostDeploymentPath, "utf8"),
);
const arbitrumSepoliaDeployment = JSON.parse(
  fs.readFileSync(arbitrumSepoliaDeploymentPath, "utf8"),
);

const frontendDeployments = {
  localhost: {
    ConfidentialPayroll: localhostDeployment.ConfidentialPayroll,
    MockPayoutToken: localhostDeployment.MockPayoutToken,
    MockQueryDecrypter: localhostDeployment.MockQueryDecrypter,
  },
  "arb-sepolia": {
    ConfidentialPayroll: arbitrumSepoliaDeployment.ConfidentialPayroll,
    MockPayoutToken: arbitrumSepoliaDeployment.MockPayoutToken,
  },
};

fs.mkdirSync(generatedRoot, { recursive: true });
fs.writeFileSync(
  path.join(generatedRoot, "confidential-payroll.abi.json"),
  JSON.stringify(payrollArtifact.abi, null, 2),
);
fs.writeFileSync(
  path.join(generatedRoot, "mock-query-decrypter.abi.json"),
  JSON.stringify(mockQueryDecrypterArtifact.abi, null, 2),
);
fs.writeFileSync(
  path.join(generatedRoot, "deployments.json"),
  JSON.stringify(frontendDeployments, null, 2),
);

console.log("Synced payroll ABI and deployment files into app/src/lib/generated.");
