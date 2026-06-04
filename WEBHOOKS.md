# MyDashboard — Webhook Health

## Endpoint

`POST /api/webhook/health`

## Authentication

Header requis : `x-webhook-secret: mydashboard2024`

## Payload

```json
{
  "type": "weight" | "sleep" | "nutrition",
  "data": {
    "date": "2024-01-15",
    "value": 75.5,
    "unit": "kg" | "hours" | "kcal"
  }
}
```

## Exemples curl

### Poids
```bash
curl -X POST http://localhost:3000/api/webhook/health \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: mydashboard2024" \
  -d '{"type":"weight","data":{"date":"2024-01-15","value":75.5,"unit":"kg"}}'
```

### Sommeil
```bash
curl -X POST http://localhost:3000/api/webhook/health \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: mydashboard2024" \
  -d '{"type":"sleep","data":{"date":"2024-01-15","value":7.5,"unit":"hours"}}'
```

### Calories
```bash
curl -X POST http://localhost:3000/api/webhook/health \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: mydashboard2024" \
  -d '{"type":"nutrition","data":{"date":"2024-01-15","value":2200,"unit":"kcal"}}'
```

## Réponse succès (200)
```json
{
  "success": true,
  "type": "weight",
  "created": { "id": "...", "date": "2024-01-15T00:00:00.000Z", "weight": "75.5" }
}
```

## Réponse erreur (401)
```json
{ "error": "Unauthorized" }
```
