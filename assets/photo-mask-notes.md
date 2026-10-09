# Photo mask provenance

The original `public/images/FP002119.JPG` is unchanged. Masks are authored at source coordinates; their crop sizes are in `photo-layer-layout.json`. All visible subjects use the original RGB. No generative image model was used.

- Person: BiRefNet-general-lite via rembg, then source-guided corrections to the wire, the gap between the legs, and the shoe contact shadow. The wire mask was manually traced to remove bridge pixels caught by automatic segmentation. Hair uses the model's soft alpha. Fully opaque person pixels retain source RGB exactly; edge pixels are decontaminated against the concealed background plate.
- Buildings: the rough polygons in `photo-architecture-masks.json` seed full-resolution OpenCV GrabCut. Refined masks follow roof and antenna contours and stop at the shop frontage. Both warehouses share one movement plane.
- Crowds: overlapping high-resolution tiles, YOLOv8n-seg person / bicycle / carried-object detections, followed by RGB GrabCut boundary refinement. The main person is excluded. Very distant figures and reflections can remain in the background; this is a manually reviewed scene mask, not a claim of complete instance segmentation.
- Hidden pixels: `scripts/prepare-photo-background.py` uses OpenCV Telea inpainting at half resolution. A separate plate removes only crowds to retain wall surfaces behind them. These plates support the small displacement, not a large viewpoint change.

The shipped PNG masks and lossless WebP plates are the authoring inputs; no model, Python dependency, or inference service is needed for normal builds or visitors. Rebuild the derived public assets with `scripts/create-photo-layers.mjs`. Only regenerate the plates after editing a mask.

Model sources used during offline authoring:

- [BiRefNet-general-lite via rembg](https://github.com/danielgatis/rembg) (download verified against rembg's MD5 `4fab47adc4ff364be1713e97b7e66334`). See the upstream [BiRefNet project](https://github.com/ZhengPeng7/BiRefNet) for its MIT license.
- [Kalray YOLOv8n-seg ONNX](https://huggingface.co/Kalray/yolov8n-seg/tree/e99ff890acc539935dc28696a92fe1c023097666) (SHA256 `aaa517ec9fd9a2e4e931109b372a14d952ca02cebb67d086a2666fd360502793`). The model card labels GPL-3.0; upstream Ultralytics uses AGPL-3.0. The model and inference library are not redistributed here.
