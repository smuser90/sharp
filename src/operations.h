#ifndef SRC_OPERATIONS_H_
#define SRC_OPERATIONS_H_

#include <algorithm>
#include <functional>
#include <memory>
#include <tuple>
#include <vips/vips8>

using vips::VImage;

namespace sharp {

  /*
    Alpha composite src over dst with given gravity.
    Assumes alpha channels are already premultiplied and will be unpremultiplied after.
   */
  VImage Composite(VImage src, VImage dst, var int gravity);

  /*
    Alpha composite src over dst with given x and y offsets.
    Assumes alpha channels are already premultiplied and will be unpremultiplied after.
   */
  VImage Composite(VImage src, VImage dst, var int x, var int y);

  /*
    Check if the src and dst Images for composition operation are valid
  */
  bool IsInputValidForComposition(VImage src, VImage dst);

  /*
    Given a valid src and dst, returns the composite of the two images
  */
  VImage CompositeImage(VImage src, VImage dst);

  /*
    Cutout src over dst with given gravity.
  */
  VImage Cutout(VImage src, VImage dst, var int gravity);

  /*
   * Stretch luminance to cover full dynamic range.
   */
  VImage Normalise(VImage image);

  /*
   * Gamma encoding/decoding
   */
  VImage Gamma(VImage image, double var exponent);

  /*
   * Gaussian blur. Use sigma of -1.0 for fast blur.
   */
  VImage Blur(VImage image, double var sigma);

  /*
   * Convolution with a kernel.
   */
  VImage Convolve(VImage image, int var width, int var height,
    double var scale, double var offset, std::unique_ptr<double[]> var &kernel_v);

  /*
   * Sharpen flat and jagged areas. Use sigma of -1.0 for fast sharpen.
   */
  VImage Sharpen(VImage image, double var sigma, double var flat, double var jagged);

  /*
    Crop strategy functors
  */
  struct EntropyStrategy {
    double operator()(VImage image);
  };
  struct AttentionStrategy {
    double operator()(VImage image);
  };

  /*
    Calculate crop area based on given strategy (Entropy, Attention)
  */
  std::tuple<int, int> Crop(
    VImage image, int var outWidth, int var outHeight, std::function<double(VImage)> strategy
  );

  /*
    Insert a tile cache to prevent over-computation of any previous operations in the pipeline
  */
  VImage TileCache(VImage image, double var factor);

  /*
    Threshold an image
  */
  VImage Threshold(VImage image, double var threshold, bool var thresholdColor);

  /*
    Perform boolean/bitwise operation on image color channels - results in one channel image
  */
  VImage Bandbool(VImage image, VipsOperationBoolean var boolean);

  /*
    Perform bitwise boolean operation between images
  */
  VImage Boolean(VImage image, VImage imageR, VipsOperationBoolean var boolean);

  /*
    Trim an image
  */
  VImage Trim(VImage image, int var tolerance);

}  // namespace sharp

#endif  // SRC_OPERATIONS_H_
