import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672"],
      queue: "wallets_debit_queue",
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT ?? "4002";
  await app.listen(port, "0.0.0.0");
  console.log(`Wallets service running on port ${port}`);
}

bootstrap();
