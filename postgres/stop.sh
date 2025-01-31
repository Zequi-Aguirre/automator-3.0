#!/bin/bash

podman-compose --file dev.yml down
podman-compose --file test.yml down