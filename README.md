# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

- [x] Black & White
- [x] Line & dashed line
- [x] Crop
- [x] Show a proceed button when clicked on crop, Then when user click on proceed, it will save the previous changes and then it will show the crop tool
- [x] Try displaing toolbar on the top of the canvas
- [x] Make the text tool draggable anywhere on the canvas
- [x] Add curve tool to draw curves on the image
- [x] Add a curve arrow tool to draw curves with arrowheads on the image
- [ ] The curve should be smooth automatically after finishing the curve
- [ ] Add options in crop to select the area to crop in aspect-ratios - 3:4, 9:16 etc
- [x] Add a camera button in mobile view to take a photo and use it as an image
- [ ] Arrow and Double arrow tools should rotate and resize with pinch/zoom gestures
- [x] Arrow and Double arrow tools should be draggable easily

**Bugs**

- [x] When you click on the image, the canvas is not centered
- [x] when we click to open the image, below cell get selected
- [x] For some images the curve line is not created at mouse position but with some offset.
- [ ] In Mobile view the Curve tool is only working correctly when a stylus is used - the surface area of the finger tips is making it hard to draw with fingers.
- [x] The canvas is taking full width of its parent div's parent div.
- [x] We are able to draw outside the image also.
- [x] The curve arrow tools arrow heads are not drawn correctly.
- [ ] The images are stored in local storage which have some limitations.

**Responsiveness**

- [x] Max space to image
- [x] Remove the upper area (image name, X icon)
- [x] Undo, Redo, Filter, Download button in one horizontal row (above image)
- [x] Undo Redo button in larger screens
- [x] Save Changes, Cancel, Apply Filter, Download button in one horizontal line (larger screen)

**Testing Bugs**

- [x] Text not editing in mobile view.
- [x] icons for curve and curve arrow are same.
- [x] After applying crop, the image is not editatble in actual mobile devices.
- [x] cancel button should contain a confirmation dialog to discard changes.
- [x] The stroke style drpdown appears on top sometimes in actual mobile device.

**Future Improvements**

- [ ] how to finalize the curve tools in mobile devices.
- [ ] Camera icon along side to "upload image" button to click photo in mobile devices.
- [ ] Directly share the image to whatsapp.
- [x] Maintain the shape of the circle during transform.
- [X] add drag and drop to the image editor.
