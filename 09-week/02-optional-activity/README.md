# Products API

## Execution

Run the application with:

```bash
./mvnw spring-boot:run

The API runs at http://localhost:8080.

Endpoints
- GET /api/products - Gets all products.
- GET /api/products/{id} - Gets a product by ID.
- POST /api/products - Creates a product.
- PUT /api/products/{id} - Updates a product.
- DELETE /api/products/{id} - Deletes a product.

API reference
The GET endpoint returns all products.
The GET by ID endpoint returns one product.
The POST endpoint creates a product.
The PUT endpoint updates a product.
The DELETE endpoint deletes a product.
```