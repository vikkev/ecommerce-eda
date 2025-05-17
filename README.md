# E-commerce Event-Driven Architecture com RabbitMQ e DLQ

Este projeto implementa um sistema de e-commerce utilizando arquitetura EDA (Event-Driven Architecture) com RabbitMQ e Dead Letter Queue (DLQ) para gerenciamento de falhas no processamento de mensagens.

## Estrutura do Projeto

O projeto segue uma arquitetura limpa (Clean Architecture) com as seguintes camadas:

- **Domain**: Contém as entidades de negócio e definições de eventos
- **Application**: Contém serviços e interfaces com o usuário (APIs)
- **Infrastructure**: Contém a implementação da comunicação com RabbitMQ e outros serviços externos

## Funcionalidades

- Publicação de eventos no RabbitMQ
- Consumo de mensagens com tratamento de falhas
- Implementação de Dead Letter Queue (DLQ)
- Monitoramento e reprocessamento de mensagens da DLQ
- API REST para interação com o sistema

## Fluxo de Mensagens

1. Um pedido é criado via API REST
2. Um evento `OrderCreated` é publicado no RabbitMQ
3. O subscriber processa a mensagem e tenta enviar para uma API externa
4. Em caso de falha no processamento:
   - A mensagem é reenfileirada até o limite de tentativas
   - Após esgotar as tentativas, a mensagem é movida para a DLQ
5. Mensagens na DLQ podem ser monitoradas e reprocessadas posteriormente

## Requisitos

- Node.js v16+
- TypeScript
- RabbitMQ

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```
3. Configure o arquivo `.env` baseado no `.env.example`
4. Execute o RabbitMQ (via Docker ou instalação local)
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

## Executando o Projeto

Para desenvolvimento:
```bash
npm run dev
```

Para produção:
```bash
npm run build
npm start
```

## API Endpoints

### Pedidos
- `POST /api/orders` - Criar um novo pedido
- `PUT /api/orders/:id/status` - Atualizar o status de um pedido
- `POST /api/orders/:id/payment` - Processar pagamento de um pedido

### DLQ Management
- `GET /api/dlq/status` - Verificar status da DLQ
- `POST /api/dlq/reprocess` - Reprocessar mensagens da DLQ

## Exemplos de Uso

### Criar Pedido

```json
POST /api/orders
{
  "customerId": "customer123",
  "items": [
    {
      "productId": "prod001",
      "name": "Smartphone",
      "price": 999.99,
      "quantity": 1
    }
  ]
}
```

### Atualizar Status

```json
PUT /api/orders/order123/status
{
  "status": "processing"
}
```

### Processar Pagamento

```json
POST /api/orders/order123/payment
{
  "paymentDetails": {
    "method": "credit_card",
    "amount": 999.99
  }
}
```

### Reprocessar Mensagens da DLQ

```json
POST /api/dlq/reprocess
{
  "count": 5
}
```