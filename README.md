# TaskFlow microservices lab

Three services: frontend (Node.js, 3000), task-service (Flask, 5001), analytics-service (Flask, 5002).

## Local run with Docker

From repository root:

```sh
docker network create taskflow-net
docker build -t taskflow-task:local ./task-service
docker build -t taskflow-analytics:local ./analytics-service
docker build -t taskflow-frontend:local ./frontend
docker run -d --name task-service --network taskflow-net taskflow-task:local
docker run -d --name analytics-service --network taskflow-net -e TASK_SERVICE_URL=http://task-service:5001 taskflow-analytics:local
docker run -d --name frontend --network taskflow-net -p 3000:3000 -e TASK_SERVICE_URL=http://task-service:5001 -e ANALYTICS_SERVICE_URL=http://analytics-service:5002 taskflow-frontend:local
```

Open http://localhost:3000. Check logs with `docker logs <container>`.

## Kubernetes service discovery

Set frontend env `TASK_SERVICE_URL=http://task-service:5001` and `ANALYTICS_SERVICE_URL=http://analytics-service:5002` when Services share a namespace. Set analytics env `TASK_SERVICE_URL=http://task-service:5001`. Create Deployments and ClusterIP Services with those names. Expose only the frontend through Ingress.

## Learning limitations

Task storage is in-memory and disappears on restart. **Do not scale task-service above one replica until using a shared database.** Analytics relies on task-service; its `/health` checks its own process only. CI workflows and Kubernetes manifests are intentionally left to the learner.
