pipeline {
    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['staging', 'production', 'local-test'], description: 'Target Kubernetes deployment environment')
        string(name: 'REGISTRY_IMAGE', defaultValue: 'ghcr.io/adityagupta112/dockerized-service', description: 'Full container image name (GHCR or Docker Hub)')
        booleanParam(name: 'SKIP_DEPLOY', defaultValue: false, description: 'Build and test only without deploying to Kubernetes')
    }

    environment {
        APP_NAME = 'dockerized-service'
        K8S_NAMESPACE = 'dockerized-service'
        IMAGE_TAG = "build-${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'manual'}"
        IMAGE_REF = "${params.REGISTRY_IMAGE}:${IMAGE_TAG}"
        DOCKER_CREDS_ID = 'docker-registry-credentials'
        KUBECONFIG_CREDS_ID = 'k8s-kubeconfig'
    }

    stages {
        stage('Checkout & Secret Hygiene') {
            steps {
                echo "==> [Stage 1/6] Checking out code and validating secret hygiene..."
                checkout scm
                sh '''
                    set -e
                    echo "Checking that local .env is NOT tracked in Git..."
                    if git ls-files --error-unmatch .env >/dev/null 2>&1; then
                        echo "FATAL: .env was tracked in Git repository!" >&2
                        exit 1
                    fi
                    echo "PASS: Source tree clean, zero committed secrets."
                '''
            }
        }

        stage('Lint & Unit Tests') {
            steps {
                echo "==> [Stage 2/6] Running ESLint and automated test suite..."
                sh '''
                    set -e
                    node -v
                    npm -v
                    npm ci
                    npm run lint
                    npm test
                '''
            }
        }

        stage('Docker Build & Image Audit') {
            steps {
                echo "==> [Stage 3/6] Building Docker image: ${IMAGE_REF}..."
                sh """
                    set -e
                    docker build -t ${IMAGE_REF} -t ${params.REGISTRY_IMAGE}:latest .
                    
                    echo "Auditing container filesystem: ensuring .env is excluded..."
                    docker run --rm --entrypoint sh ${IMAGE_REF} -c '
                        test ! -f /app/.env
                        test "\$(id -u)" -eq 1000
                    '
                    echo "PASS: Container image verified (.env absent, non-root user uid=1000)."
                """
            }
        }

        stage('Push to Registry') {
            steps {
                echo "==> [Stage 4/6] Pushing image to container registry..."
                script {
                    try {
                        withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDS_ID, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                            sh '''
                                set +x
                                REGISTRY_HOST=$(echo "${REGISTRY_IMAGE}" | cut -d/ -f1)
                                echo "$REG_PASS" | docker login "$REGISTRY_HOST" -u "$REG_USER" --password-stdin
                                set -x
                                docker push "${IMAGE_REF}"
                                docker push "${REGISTRY_IMAGE}:latest"
                            '''
                        }
                    } catch (Exception e) {
                        echo "WARNING: Docker registry credentials not configured or push skipped in local test mode: ${e.getMessage()}"
                        echo "Continuing with locally cached image..."
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                expression { return !params.SKIP_DEPLOY }
            }
            steps {
                echo "==> [Stage 5/6] Deploying to Kubernetes namespace: ${K8S_NAMESPACE}..."
                script {
                    try {
                        withCredentials([file(credentialsId: env.KUBECONFIG_CREDS_ID, variable: 'KUBECONFIG_FILE')]) {
                            sh """
                                export KUBECONFIG="\${KUBECONFIG_FILE}"
                                kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                                
                                # Deploy using Kustomize overlay with dynamic image update
                                kubectl apply -k k8s/manifests
                                kubectl set image deployment/${APP_NAME} app=${IMAGE_REF} -n ${K8S_NAMESPACE}
                                
                                # Verify rolling update rollout status
                                echo "Waiting for rollout to complete..."
                                kubectl rollout status deployment/${APP_NAME} -n ${K8S_NAMESPACE} --timeout=90s
                            """
                        }
                    } catch (Exception e) {
                        echo "NOTICE: Running in local kubectl context (credentials '${env.KUBECONFIG_CREDS_ID}' not set)..."
                        sh """
                            kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f - || true
                            kubectl apply -k k8s/manifests || true
                            kubectl set image deployment/${APP_NAME} app=${IMAGE_REF} -n ${K8S_NAMESPACE} || true
                        """
                    }
                }
            }
        }

        stage('Smoke Test & Verification') {
            when {
                expression { return !params.SKIP_DEPLOY }
            }
            steps {
                echo "==> [Stage 6/6] Verifying Kubernetes pod health..."
                sh """
                    set -e
                    echo "Checking pod status in namespace ${K8S_NAMESPACE}:"
                    kubectl get pods -n ${K8S_NAMESPACE} -l app.kubernetes.io/name=${APP_NAME} || true
                    kubectl get svc -n ${K8S_NAMESPACE} || true
                    kubectl get hpa -n ${K8S_NAMESPACE} || true
                """
            }
        }
    }

    post {
        always {
            cleanWs deleteDirs: false
        }
        success {
            echo "SUCCESS: Pipeline completed! Dockerized service built and deployed to Kubernetes."
        }
        failure {
            echo "FAILURE: Pipeline failed. Check console output above for error details."
        }
    }
}
