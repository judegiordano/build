import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'

// Get current stack
export const stack = pulumi.getStack()

// Get default vpc
const vpc = awsx.ec2.Vpc.getDefault()

// Create build sqs queue
const queue = new aws.sqs.Queue(`build-${stack}`, {
  fifoQueue: true,
  visibilityTimeoutSeconds: 15 * 60
})

// Create ECR repo
const repo = new awsx.ecr.Repository('swift-cloud')

// Build docker image
const image = repo.buildAndPushImage({
  context: './',
  dockerfile: './Dockerfile'
})

// Create service
const cluster = new awsx.ecs.Cluster('swift-build', {
  vpc,
  capacityProviders: ['FARGATE', 'FARGATE_SPOT'],
  defaultCapacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE',
      weight: 1,
      base: 1
    },
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 100
    }
  ]
})

// Task role
const taskRole = new aws.iam.Role('swift-build-task-role', {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.EcsTasksPrincipal),
  managedPolicyArns: [
    aws.iam.ManagedPolicy.AmazonSQSFullAccess,
    aws.iam.ManagedPolicy.AmazonS3FullAccess,
    aws.iam.ManagedPolicy.CloudWatchLogsFullAccess
  ]
})

// Attach sqs permissions
export const sqsRoleAttachment = new aws.iam.RolePolicyAttachment(
  'swift-build-task-role-sqs-attachment',
  {
    policyArn: aws.iam.ManagedPolicy.AmazonSQSFullAccess,
    role: taskRole
  }
)

// Attach s3 permissions
export const s3RoleAttachment = new aws.iam.RolePolicyAttachment(
  'swift-build-task-role-s3-attachment',
  {
    policyArn: aws.iam.ManagedPolicy.AmazonS3FullAccess,
    role: taskRole
  }
)

// Attach cloudwatch permissions
export const logsRoleAttachment = new aws.iam.RolePolicyAttachment(
  'swift-build-task-role-logs-attachment',
  {
    policyArn: aws.iam.ManagedPolicy.CloudWatchLogsFullAccess,
    role: taskRole
  }
)

// Create task definition
export const taskDefinition = new awsx.ecs.FargateTaskDefinition('swift-build-task', {
  container: {
    image,
    cpu: 2 * 1024,
    environment: [{ name: 'SQS_QUEUE_URL', value: queue.url }]
  },
  taskRole
})
