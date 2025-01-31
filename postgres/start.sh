#!/bin/bash

podman-compose --file dev.yml up --detach
podman-compose --file test.yml up --detach