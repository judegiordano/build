import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'

// Get current stack
export const stack = pulumi.getStack()

// Allocate a new VPC with the default settings:
const vpc = new awsx.ec2.Vpc('swift-cloud', {
  cidrBlock: '172.31.0.0/16',
  subnets: [{ type: 'public' }],
  numberOfAvailabilityZones: 1
})

// Create build sqs queue
const queue = new aws.sqs.Queue(`build-${stack}`, {
  visibilityTimeoutSeconds: 15 * 60
})

// Create ECR repo
const repo = new awsx.ecr.Repository('swift-cloud')

// Build docker image
const image = repo.buildAndPushImage({
  context: './',
  dockerfile: './Dockerfile',
  cacheFrom: {
    stages: ['base']
  }
})

// Create service
const cluster = new awsx.ecs.Cluster('swift-build', {
  vpc
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

// Create container
export const service = new awsx.ecs.FargateService('swift-build-service', {
  cluster,
  desiredCount: 1,
  taskDefinitionArgs: {
    container: {
      image,
      essential: true,
      cpu: 4 * 1024,
      memory: 2 * 1024,
      memoryReservation: 1024,
      environment: [{ name: 'SQS_QUEUE_URL', value: queue.url }]
    },
    taskRole
  }
})
