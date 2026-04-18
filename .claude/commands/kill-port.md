Kill the process listening on port $ARGUMENTS.

Run this bash command and report whether the port was freed or was already free:

```bash
port="$ARGUMENTS"
pid=$(netstat -ano | grep ":${port}[^0-9]" | grep LISTENING | awk '{print $NF}' | head -1)
if [ -z "$pid" ]; then
  echo "Port $port is already free."
else
  taskkill //F //PID $pid && echo "Killed PID $pid on port $port." || echo "Failed to kill PID $pid."
fi
```
