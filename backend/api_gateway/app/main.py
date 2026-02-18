# api-gateway/app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import httpx
import os

app = FastAPI(title="FinTracker API Gateway", version="1.0.0")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite default dev server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]  # Allow frontend to read custom headers
)
# Service URLs
def get_service_url(name: str, default: str) -> str:
    return os.getenv(f"{name.upper()}_SERVICE_URL", default)

SERVICES = {
    "auth": get_service_url("AUTH", "http://localhost:8001"),
    "portfolio": get_service_url("PORTFOLIO", "http://localhost:8002"),
    "news": get_service_url("NEWS", "http://localhost:8003"),
    "quant": get_service_url("QUANT", "http://localhost:8004"),
}



@app.api_route("/api/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_proxy(request: Request, path: str):
    """Proxy requests to auth service"""
    return await proxy_request(request, "auth", path)


@app.post("/api/v1/portfolio/chat")
async def portfolio_chat_proxy(request: Request):
    """Dedicated streaming proxy for the chatbot endpoint — bypasses JSONResponse buffering."""
    service_url = SERVICES.get("portfolio")
    url = f"{service_url}/api/v1/chat"
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ["host", "content-length"]}
    body = await request.body()

    async def stream_generator():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", url, headers=headers, content=body) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        yield error_body
                        return
                    async for chunk in response.aiter_bytes():
                        yield chunk
        except httpx.RequestError as e:
            yield f"data: {{\"error\": \"{str(e)}\"}}".encode()

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.api_route("/api/v1/portfolio/{path:path}", methods=["GET", "POST", "PUT", "DELETE"]) 
async def portfolio_proxy(request: Request, path: str):
    """Proxy requests to portfolio service"""
    return await proxy_request(request, "portfolio", path)


@app.api_route("/api/v1/market/news/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def news_proxy(request: Request, path: str):
    """Proxy requests to news service"""
    return await proxy_request(request, "news", path)

@app.api_route("/api/v1/quant/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def quant_proxy(request: Request, path: str):
    """Proxy requests to quant service"""
    return await proxy_request(request, "quant", path)


async def proxy_request(request: Request, service: str, path: str):
    """Generic proxy function"""
    service_url = SERVICES.get(service)
    if not service_url:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Fixed: Remove the service prefix and forward the path as expected by microservices
    url = f"{service_url}/api/v1/{path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=url,
                headers={k: v for k, v in request.headers.items() if k.lower() not in ['host', 'content-length']},
                params=dict(request.query_params),
                content=await request.body()
            )
            
            # Return the response with proper status code and headers
            return JSONResponse(
                content=response.json() if response.headers.get("content-type", "").startswith("application/json") else {"data": response.text},
                status_code=response.status_code,
                headers=dict(response.headers)
            )
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "api-gateway"}
