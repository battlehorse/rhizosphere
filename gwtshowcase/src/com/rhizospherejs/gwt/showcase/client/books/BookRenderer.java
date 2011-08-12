/*
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

package com.rhizospherejs.gwt.showcase.client.books;

import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.MouseOutEvent;
import com.google.gwt.event.dom.client.MouseOutHandler;
import com.google.gwt.event.dom.client.MouseOverEvent;
import com.google.gwt.event.dom.client.MouseOverHandler;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.DialogBox;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.VerticalPanel;

import com.rhizospherejs.gwt.client.Rhizosphere;
import com.rhizospherejs.gwt.client.RhizosphereModelRef;
import com.rhizospherejs.gwt.client.RhizosphereRenderer;
import com.rhizospherejs.gwt.client.renderer.HasCacheDimensions;
import com.rhizospherejs.gwt.client.renderer.HasCustomDragHandlers;
import com.rhizospherejs.gwt.client.renderer.RenderingOutput;
import com.rhizospherejs.gwt.showcase.client.resources.Resources;

import java.util.Map;

/**
 * A Rhizosphere renderer that programmatically assembles the rendering as a
 * composed GWT widget.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class BookRenderer implements 
      RhizosphereRenderer<Book>, HasCustomDragHandlers, HasCacheDimensions {

  private Map<String, RhizosphereModelRef> books;
  private Rhizosphere<Book> rhizosphere;
  
  public BookRenderer(Map<String, RhizosphereModelRef> books, Rhizosphere<Book> rhizosphere) {
    this.books = books;
    this.rhizosphere = rhizosphere;
  }

  @Override
  public void render(final Book book, boolean expanded, RenderingOutput helper) {
    HorizontalPanel hp = new HorizontalPanel();

    // Create a drag handle: users will be able to drag Book renderings by using
    // this handle.
    Label dragHandler = new Label();
    dragHandler.setHeight(book.getThumbnailHeight() + "px");
    dragHandler.setWidth("1em");
    dragHandler.setStyleName(Resources.INSTANCE.booksCss().bookDragHandler(), true);

    // Tell Rhizosphere about the handler (otherwise Rhizosphere will make the
    // entire widget draggable). Remember to include the HasCustomDragHandlers
    // interface.
    helper.addDragHandler(dragHandler);
    hp.add(dragHandler);

    // Book thumbnail.
    Image img = new Image(
        book.getThumbnailUrl(), 0, 0, book.getThumbnailWidth(), book.getThumbnailHeight());
    hp.add(img);
    
    // Button to remove the current Book from the visualization.
    final Button closeButton = new Button("x", new ClickHandler() {
      @Override
      public void onClick(ClickEvent event) {
        rhizosphere.removeModel(books.get(book.getBookId()), null);
      }
    });
    closeButton.setStyleName(Resources.INSTANCE.booksCss().bookCloseButton());
    closeButton.setVisible(false);
    hp.add(closeButton);    
    
    // Register events on the image thumbnail, to show a dialog box with
    // additional information about the selected book.
    img.addClickHandler(new ClickHandler() {

      @Override
      public void onClick(ClickEvent event) {
        closeButton.setVisible(false);
        final DialogBox db = new DialogBox(true, true);
        db.setAnimationEnabled(true);
        db.setGlassEnabled(true);
        
        HorizontalPanel hp = new HorizontalPanel();
        Image img = new Image(
            book.getThumbnailUrl(), 0, 0, book.getThumbnailWidth(), book.getThumbnailHeight());
        img.getElement().getStyle().setMargin(0.5, Unit.EM);
        hp.add(img);

        VerticalPanel p = new VerticalPanel();
        p.setStyleName(Resources.INSTANCE.booksCss().bookData(), true);

        Label authors = new Label(book.getAuthors());
        authors.setStyleName(Resources.INSTANCE.booksCss().bookAuthors());
        p.add(authors);

        Label title = new Label(book.getTitle());
        title.setStyleName(Resources.INSTANCE.booksCss().bookTitle(), true);
        p.add(title);

        Label details = new Label(
            "Published:" + String.valueOf(book.getPublishedYear()) + " " +
            "Pages: " + String.valueOf(book.getNumberOfPages()));
        details.setStyleName(Resources.INSTANCE.booksCss().bookDetails(), true);
        p.add(details);

        Anchor viewInGoogleBooks = new Anchor("View in Google Books", book.getUrl(), "_blank");
        viewInGoogleBooks.addClickHandler(new ClickHandler() {
          @Override public void onClick(ClickEvent event) {
            db.hide();
          }
        });
        p.add(viewInGoogleBooks);

        hp.add(p);
        db.add(hp);
        db.center();
      }
    });
    
    // Show the 'close' button when hovering over the book thumbnail.
    img.addMouseOverHandler(new MouseOverHandler() {
      
      @Override
      public void onMouseOver(MouseOverEvent event) {
        closeButton.setVisible(true);
        
      }
    });
    
    // Hide the 'close' button when the mouse moves out of the book thumbnail
    // (unless it moves over the 'close' button itself)
    img.addMouseOutHandler(new MouseOutHandler() {
      
      @Override
      public void onMouseOut(MouseOutEvent event) {
        if (closeButton.getElement() != event.getRelatedTarget().cast()) {
          closeButton.setVisible(false);
        }
      }
    });

    // Emit the widget to Rhizosphere once you have finished assembling it.
    helper.emitWidget(hp);
  }

  // Declare that renderings won't change their dimensions once displayed
  // (useful for Rhizosphere to optimize its behavior).
  @Override
  public boolean cacheDimensions() {
    return true;
  }
}
