PYTHON=python3
SERVER=backend.api.main:app
FRONTEND_DIR=frontend
HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_PORT=8080

.PHONY: start stop clean install

install:
	@echo "Installing Python dependencies..."
	@$(PYTHON) -m pip install -r backend/requirements.txt
	@echo "Dependencies installed."

start:
	@echo "Starting backend server..."
	@$(PYTHON) -m uvicorn $(SERVER) --reload --host $(HOST) --port $(BACKEND_PORT) &
	@echo "Backend server started on http://$(HOST):$(BACKEND_PORT)"
	@echo "Starting frontend server..."
	@cd $(FRONTEND_DIR) && $(PYTHON) -m http.server $(FRONTEND_PORT) &
	@echo "Frontend server started on http://localhost:$(FRONTEND_PORT)"
	@echo "Opening frontend in browser..."
	@sleep 2
	@case "$$(uname)" in \
		"Linux") xdg-open http://localhost:$(FRONTEND_PORT) ;; \
		"Darwin") open http://localhost:$(FRONTEND_PORT) ;; \
		"CYGWIN"*|"MINGW32"*|"MSYS"*|"MINGW"*) start http://localhost:$(FRONTEND_PORT) ;; \
		*) echo "Platform $$OSTYPE not supported" ;; \
	esac &

stop:
	@echo "Stopping backend server..."
	@-pkill -f "$(SERVER)"
	@echo "Stopping frontend server..."
	@-pkill -f "http.server $(FRONTEND_PORT)"
	@echo "Servers stopped."

clean:
	@echo "Cleaning up..."
	@-find . -name '*.pyc' -delete
	@-find . -name '__pycache__' -delete
	@echo "Clean up completed."
